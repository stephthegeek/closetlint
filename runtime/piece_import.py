"""Validated, atomic assistant intake. No scraping, network access or database replacement."""
import datetime as dt
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import parse_qs, urlsplit
import warnings

from storage import encode, media_type, decode, require_safe_pillow

VOCAB = json.loads(Path(__file__).with_name('import-vocabulary.json').read_text(encoding='utf-8'))
KINDS = ('isolated', 'model', 'scene', 'flatlay', 'display', 'detail', 'unclassified', 'recast', 'carelabel')
MAX_FILE = 32 * 1024 * 1024
MAX_TOTAL = 192 * 1024 * 1024
LAYER = {'labAs': ('top', 'layer', 'either', 'under'), 'layerNeed': ('none', 'under', 'over', 'either'), 'weight': ('thin', 'regular', 'thick')}
TEXT = {'name': 180, 'size': 60, 'retailer': 120, 'variant': 180, 'priceNote': 300, 'originalTitle': 600, 'listingDetails': 6000, 'fitsLike': 60}


def text(value, limit, field):
    if value is None:
        return ''
    if not isinstance(value, str) or len(value) > limit or '\x00' in value:
        raise ValueError(f'{field}: use text up to {limit} characters')
    return value.strip()


def url(value, *, image=False):
    value = text(value, 2000, 'image source URL' if image else 'product URL')
    if not value:
        return ''
    try:
        u = urlsplit(value)
        if u.scheme not in (('https',) if image else ('http', 'https')) or not u.hostname or u.username or u.password or any(c.isspace() for c in value):
            raise ValueError()
        u.port
    except ValueError:
        raise ValueError('Use a full http(s) product URL or https image source URL without credentials') from None
    return value


def normal(value):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', value or '').lower(), flags=re.UNICODE).replace('_', ' ').strip()


def product_key(value):
    if not value:
        return ''
    u = urlsplit(value)
    host = (u.hostname or '').lower().removeprefix('www.')
    if host == 'temu.com' or host.endswith('.temu.com'):
        number = parse_qs(u.query).get('goods_id', [''])[0] or next(iter(re.findall(r'-g-(\d+)\.html', u.path)), '')
        if number:
            return 'temu:' + number
    if host == 'amazon.com' or host.endswith('.amazon.com'):
        match = re.search(r'/(?:dp|gp/product)/([A-Z0-9]{10})(?:/|$)', u.path, re.I)
        if match:
            return 'amazon:' + match[1].upper()
    # Opaque share links differ in their query as well as their path.
    query = u.query if host.startswith('share.') else ''
    return host + u.path.rstrip('/') + ('?' + query if query else '')


def matches(a, b):
    if a.get('size') and b.get('size') and normal(a['size']) != normal(b['size']):
        return False
    if a.get('variant') and b.get('variant') and normal(a['variant']) != normal(b['variant']):
        return False
    ak, bk = product_key(a.get('url')), product_key(b.get('url'))
    # Descriptive color tags can change after review. An explicit matching
    # listing variant identifies the same item without collapsing pack colors.
    if ak and ak == bk and normal(a.get('variant')) and normal(a.get('variant')) == normal(b.get('variant')):
        return True
    if a.get('colors') and b.get('colors') and sorted(a['colors']) != sorted(b['colors']):
        return False
    return bool(ak and bk and ak == bk) or normal(a.get('name')) == normal(b.get('name'))


def size_kind(meta, sub):
    if meta == 'Glasses':
        return 'none' if sub == 'Accessories' else 'glasses'
    if meta == 'Footwear':
        return 'shoe'
    if meta == 'Jewelry':
        return 'ring' if sub == 'Rings' else 'gauge' if sub == 'Earrings' else 'none'
    return 'none' if meta in ('Bags', 'Hair accessories', 'Watches') else 'clothing'


def size_value(kind, value):
    value = text(value, 60, 'size')
    if not value:
        return ''
    if re.fullmatch(r'one[- ]?size|o/s|os|open|adjustable|free[- ]?size|one size fits all', value, re.I):
        value = 'o/s'
    if kind == 'glasses':
        if value.lower().startswith('comp'):
            value = 'Intermediate'
        for label in VOCAB['glassesTypes']:
            if value.lower() == label.lower() or value.lower().startswith(label[:4].lower()):
                return label
        raise ValueError('Glasses size must be Distance, Intermediate, Readers or Sunglasses')
    if kind == 'gauge':
        match = re.fullmatch(r'(\d{1,2})\s?(?:g|ga|gauge)?', value, re.I)
        if match and 6 <= int(match[1]) <= 28:
            return str(int(match[1])) + 'g'
        raise ValueError('Earring gauge must look like 20g or 18g; leave it blank if not applicable')
    if value == 'o/s':
        return value
    if kind == 'ring' and not (re.fullmatch(r'\d{1,2}(?:\.\d{1,2})?', value) and 2 <= float(value) <= 16):
        raise ValueError('Ring size must be 2–16, or o/s for adjustable')
    if kind == 'shoe':
        if not re.fullmatch(r'\d{1,2}(?:\.\d)?(?:\s*-\s*\d{1,2}(?:\.\d)?)?', value):
            raise ValueError('Shoe size must be a number or range, for example 9 or 8.5-9')
        value = re.sub(r'\s+', '', value)
    return value


def record(raw, notices):
    if not isinstance(raw, dict):
        raise ValueError('Each piece must be an object')
    fields = {k: text(raw.get(k), length, k) for k, length in TEXT.items()}
    category, sub = raw.get('category'), raw.get('subcategory', '')
    if category == 'Eyewear':
        category = 'Glasses'
    if not fields['name'] or category not in VOCAB['categories'] or raw.get('status') not in ('owned', 'wishlist'):
        raise ValueError('Each piece needs a name, valid category, and owned/wishlist status')
    if not isinstance(sub, str) or (sub and sub not in VOCAB['subcategories'].get(category, [])):
        raise ValueError(f'Invalid subcategory for {category}; use --schema for allowed values')
    kind = size_kind(category, sub)
    result = dict(name=fields['name'], meta=category, sub=sub, size=size_value(kind, fields['size']), sizeKind=kind,
                  source=fields['retailer'] or 'DIY import', url=url(raw.get('url')), wish=raw['status'] == 'wishlist',
                  noPhoto=True, guess=True, ar=1, date=dt.date.today().isoformat(), acquiredDate='', acquiredApproximate=False, acquisitionSource='unknown')
    for field in VOCAB['fields']:
        key, values = field['key'], field['vocab']
        value = raw.get(key, [] if field['multi'] else '')
        if field['multi']:
            if not isinstance(value, list) or any(not isinstance(x, str) for x in value):
                raise ValueError(f'{key}: use an array of tag names')
            result[key] = list(dict.fromkeys(x for x in value if x in values))
            if any(x not in values for x in value):
                notices.append(f'{key}: unrecognized tags omitted')
        else:
            if not isinstance(value, str):
                raise ValueError(f'{key}: use a tag name')
            result[key] = value if value in values else ''
            if value and not result[key]:
                notices.append(f'{key}: unrecognized tag omitted')
    for key, values in LAYER.items():
        if key in raw and raw[key] not in ('', None):
            if raw[key] not in values:
                raise ValueError(f'{key}: use one of {", ".join(values)}')
            result[key] = raw[key]
    for key, target in [('variant', 'variant'), ('priceNote', 'priceNote'), ('originalTitle', 'title'), ('listingDetails', 'listingDetails')]:
        if fields[key]:
            result[target] = fields[key]
    if fields['fitsLike']:
        result['fitsLike'] = size_value(kind, fields['fitsLike'])
    sources = raw.get('imageSources', [])
    if not isinstance(sources, list) or len(sources) > 12:
        raise ValueError('imageSources must be an array with at most 12 entries')
    if sources:
        result['imageSources'] = []
        for image in sources:
            if not isinstance(image, dict) or image.get('kind', 'unclassified') not in KINDS:
                raise ValueError('Invalid imageSources entry')
            source = url(image.get('url'), image=True)
            if not source:
                raise ValueError('imageSources entries need a source URL')
            result['imageSources'].append({'url': source, 'kind': image.get('kind', 'unclassified')})
    if 'dateApproximate' in raw and not isinstance(raw['dateApproximate'], bool):
        raise ValueError('dateApproximate must be true or false')
    if raw.get('date'):
        value = raw['date']
        if not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?', value):
            raise ValueError('date must be YYYY, YYYY-MM, or YYYY-MM-DD')
        full = value + ('-01-01' if len(value) == 4 else '-01' if len(value) == 7 else '')
        result.update(date=dt.date.fromisoformat(full).isoformat(), acquiredDate=value,
                      acquiredApproximate=raw.get('dateApproximate', False), acquisitionSource='import')
    price = raw.get('price')
    if price not in (None, ''):
        if isinstance(price, bool) or not re.fullmatch(r'\d+(?:\.\d{1,2})?', str(price)):
            raise ValueError('Price must be a nonnegative USD item price with at most two decimals, or null')
        if raw.get('currency', 'USD') != 'USD':
            raise ValueError('Only confirmed USD item prices are supported; no currency conversion')
        try:
            amount = Decimal(str(price))
            result['price'] = float(amount)
            if not result['price'] < float('inf'):
                raise ValueError('Price is too large')
        except InvalidOperation:
            raise ValueError('Invalid price') from None
    accepted = set(TEXT) | {x['key'] for x in VOCAB['fields']} | set(LAYER) | {'category', 'subcategory', 'status', 'url', 'price', 'currency', 'images', 'photoFile', 'photoUrl', 'imageSources', 'date', 'dateApproximate', 'productPhotoRequested', 'photoNote'}
    if set(raw) - accepted:
        notices.append('Unrecognized fields omitted: ' + ', '.join(sorted(set(raw) - accepted)))
    return result


def prepare_image(descriptor, folder):
    if not isinstance(descriptor, dict) or not isinstance(descriptor.get('file'), str):
        raise ValueError('Every image needs a local file; ask the assistant to download it into the import folder first')
    path = (folder / descriptor['file']).resolve()
    if not path.is_relative_to(folder) or not path.is_file():
        raise ValueError('Image files must exist inside the import JSON folder (symlinks may not escape it)')
    if path.stat().st_size > MAX_FILE:
        raise ValueError('Image file exceeds 32 MB')
    source = path.read_bytes()
    if not source:
        raise ValueError('Image file is empty')
    try:
        require_safe_pillow()
        from PIL import Image, ImageOps, UnidentifiedImageError
    except ImportError:
        raise ValueError('Photo imports need Pillow: python3 -m pip install -r runtime/requirements-import.txt') from None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(source), formats=['PNG', 'JPEG', 'WEBP', 'GIF', 'AVIF']) as original:
                if original.width * original.height > 50_000_000:
                    raise ValueError('Image exceeds 50 megapixels; export a smaller source')
                original.seek(0)
                oriented = ImageOps.exif_transpose(original)
                original_size = oriented.size
                oriented.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                alpha = oriented.mode in ('RGBA', 'LA') or 'transparency' in oriented.info
                image = oriented.convert('RGBA' if alpha else 'RGB')
                image.info.clear()
                target = io.BytesIO()
                # No EXIF/GPS metadata; keep the color profile when available.
                kwargs = {'icc_profile': original.info['icc_profile']} if original.info.get('icc_profile') and original.mode in ('RGB', 'RGBA') else {}
                image.save(target, format='PNG' if alpha else 'JPEG', **({} if alpha else {'quality': 92}), **kwargs)
                data, width, height = target.getvalue(), image.width, image.height
    except (UnidentifiedImageError, OSError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise ValueError('Image could not be decoded safely; export it as JPEG, PNG or WebP') from None
    kind = descriptor.get('kind', 'unclassified')
    if kind not in KINDS:
        raise ValueError('Unknown image kind; use --schema')
    source_url = url(descriptor.get('sourceUrl') or descriptor.get('url'), image=True)
    if len(data) > MAX_FILE:
        raise ValueError('Normalized image exceeds 32 MB')
    digest = hashlib.sha256(data).hexdigest()
    photo = {'photoId': digest[:32], 'ar': width / height, 'kind': kind, 'width': width, 'height': height}
    if source_url:
        photo['sourceUrl'] = source_url
    return photo, (media_type(data), data), {'kind': kind, 'width': width, 'height': height, 'sourceWidth': original_size[0], 'sourceHeight': original_size[1]}, len(source)


def prepare_batch(manifest, *, allow_no_photo=False):
    manifest = Path(manifest).resolve()
    if manifest.stat().st_size > 1024 * 1024:
        raise ValueError('Import JSON must be under 1 MB')
    content = manifest.read_text(encoding='utf-8')
    bundle = decode(content)
    if not isinstance(bundle, dict) or bundle.get('format') != 'closet-lint-import/v1':
        raise ValueError('Expected format closet-lint-import/v1')
    batch = bundle.get('batchId')
    if not isinstance(batch, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}', batch):
        raise ValueError('Provide a stable batchId of 1–80 letters, numbers, underscores or hyphens')
    pieces = bundle.get('pieces')
    if not isinstance(pieces, list) or not 1 <= len(pieces) <= 50:
        raise ValueError('Import 1–50 pieces per batch')
    digest = hashlib.sha256(encode(bundle).encode())
    prepared, total = [], 0
    for index, raw in enumerate(pieces):
        notices = []
        try:
            item = record(raw, notices)
            if 'productPhotoRequested' in raw and not isinstance(raw['productPhotoRequested'], bool):
                raise ValueError('productPhotoRequested must be true or false')
            photo_note = text(raw.get('photoNote'), 600, 'photoNote')
            images = raw.get('images', [])
            if not isinstance(images, list) or len(images) > 12:
                raise ValueError('images must be an array with at most 12 views')
            if raw.get('photoFile'):
                images = [{'file': raw['photoFile'], 'kind': 'unclassified', 'sourceUrl': raw.get('photoUrl', '')}] + images
            if len(images) > 12:
                raise ValueError('Use at most 12 saved image views in total')
            photos, assets, sizes = [], {}, []
            seen = set()
            for desc in images:
                photo, asset, size, count = prepare_image(desc, manifest.parent)
                total += max(count, len(asset[1]))
                if total > MAX_TOTAL:
                    raise ValueError('Import photo sources exceed 192 MB; split this batch')
                digest.update(hashlib.sha256(asset[1]).digest())
                if photo['photoId'] in seen:
                    continue
                seen.add(photo['photoId']);photos.append(photo);assets[photo['photoId']] = asset;sizes.append(size)
            if not photos and not allow_no_photo:
                raise ValueError('No local photo: download/prepare at least one, or explicitly use --allow-no-photo')
            if photos:
                item['photos'] = photos
                primary = next((p for p in photos if p['kind'] != 'carelabel'), None)
                if primary:
                    item.update(photoId=primary['photoId'], ar=primary['ar'], noPhoto=False)
                sources = item.get('imageSources', []) + [{'url': p['sourceUrl'], 'kind': p['kind']} for p in photos if p.get('sourceUrl')]
                item['imageSources'] = list({(x['url'], x['kind']): x for x in sources}.values())
            else:
                notices.append('Added without a photo by explicit option')
            row = {'record': item, 'assets': assets, 'imageInfo': sizes, 'warnings': notices, 'index': index}
            if raw.get('productPhotoRequested'):
                created = any(p['kind'] == 'recast' for p in photos)
                row['photoStatus'] = {'created': created,
                                      'note': photo_note or ('' if created else 'No reason was provided for the missing product photo. The original was kept.' if photos else 'No source photo was available.')}
            prepared.append(row)
        except ValueError as error:
            raise ValueError(f'Piece {index + 1}: {error}') from None
    return batch, digest.hexdigest(), prepared


def existing_items(db, store):
    cols = {name: {} for name in ('custom', 'edits', 'profile')}
    for col, key, value in db.execute("SELECT collection,id,payload FROM documents WHERE collection IN ('custom','edits','profile')"):
        cols[col][key] = json.loads(value)
    base = store.meta(db, 'base')
    cleanup = cols['profile'].get('cleanup', {}).get('map', {})
    result = []
    sources = [(p['id'], p) for p in base['catalog']] + [('c-' + key, value) for key, value in cols['custom'].items()]
    for key, value in sources:
        item = {**value, **base.get('tags', {}).get(key, {}), **cleanup.get(key, {}), **cols['edits'].get(key, {}), 'id': key}
        if not item.get('removed'):
            result.append(item)
    return result


def import_batch(store, batch, fingerprint, prepared, *, apply=False, duplicates='skip', promote_wishlist=False, expected_instance=None, request_id=None, part=None, cursor=''):
    policy = {'duplicates': duplicates, 'promoteWishlist': promote_wishlist}
    if request_id is not None:
        from assistant_import import request_part
        if not expected_instance or batch != request_part(request_id, part):
            raise ValueError('Request part does not match its batch ID or intended wardrobe.')
        if not isinstance(cursor, str) or len(cursor) > 1000:
            raise ValueError('Keep progress under 1000 characters.')
        policy.update(requestId='request:' + request_id, part=part, cursor=cursor)
    fingerprint = hashlib.sha256((fingerprint + encode(policy)).encode()).hexdigest()
    ledger_id = 'assistantImport:' + batch
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE' if apply else 'BEGIN')
        from assistant_import import verify_instance
        verify_instance(store, db, expected_instance)
        old = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id=?", (ledger_id,)).fetchone()
        if old:
            old = json.loads(old[0])
            if old['fingerprint'] != fingerprint:
                raise ValueError('This batchId was already used for different content/options. Keep retries unchanged or use a new batchId')
            saved = old['report']
            return {**saved, 'batchId': batch, 'mode': 'already-applied', 'committed': False, 'added': 0, 'promoted': 0, 'photosSaved': 0, 'skipped': len(saved['results']),
                    'results': [{**r, 'previousAction': r['action'], 'action': 'already_applied'} for r in saved['results']]}
        if request_id:
            progress = db.execute("SELECT payload FROM documents WHERE collection='profile' AND id=?", ('assistantRequest:' + request_id,)).fetchone()
            if progress and json.loads(progress[0]).get('state') == 'complete':
                raise ValueError('This request is complete. Start another import for new work.')
            if db.execute("SELECT 1 FROM documents WHERE collection='profile' AND id=?", ('assistantImport:' + request_id,)).fetchone():
                raise ValueError('This older single batch is already saved. Start another import for new work.')
            if part > 1 and not db.execute("SELECT 1 FROM documents WHERE collection='profile' AND id=?", ('assistantImport:' + request_part(request_id, part - 1),)).fetchone():
                raise ValueError('Save and verify the previous request part before continuing.')
        existing = existing_items(db, store)
        report = {'ok': True, 'batchId': batch, 'mode': 'applied' if apply else 'preview', 'committed': apply, 'added': 0, 'promoted': 0, 'skipped': 0, 'photosSaved': 0, 'results': [], 'next': 'Refresh the app after saving; no review dialog is needed.'}
        if request_id:
            report.update(requestId='request:' + request_id, part=part, cursor=cursor)
        for row in prepared:
            item = row['record']
            found = [p for p in existing if matches(item, p)]
            key = 'imp-' + hashlib.sha256((batch + ':' + str(row['index'])).encode()).hexdigest()[:32]
            result = {'index': row['index'] + 1, 'name': item['name'], 'warnings': row['warnings'][:], 'images': row['imageInfo'], 'matches': [p['id'] for p in found]}
            if row.get('photoStatus'):
                result['photoStatus'] = row['photoStatus']
            if found and promote_wishlist and not item['wish'] and len(found) == 1 and found[0].get('wish'):
                match = found[0]
                result.update(action='promote', id=match['id']);report['promoted'] += 1
                if apply:
                    previous = db.execute("SELECT payload FROM documents WHERE collection='edits' AND id=?", (match['id'],)).fetchone()
                    patch = {**(json.loads(previous[0]) if previous else {}), 'wish': False, **{k: item[k] for k in ('acquiredDate', 'acquiredApproximate', 'acquisitionSource')}}
                    if item['acquiredDate']:
                        patch['date'] = item['date']
                    db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?)', ('edits', match['id'], encode(patch)))
                match['wish'] = False
                result['warnings'].append('Ownership and acquisition details updated; existing tags and photos kept')
            elif found and duplicates == 'skip':
                result.update(action='skip_duplicate');report['skipped'] += 1
            else:
                if found:
                    result['warnings'].append('Duplicate added by explicit option')
                # Prefix opaque batch IDs: legacy backup validation recognizes bare 32-hex strings as asset references.
                item = {**item, 'importBatch': 'assistant:' + batch, 'addedAt': dt.datetime.now(dt.timezone.utc).isoformat()}
                result.update(action='add', id='c-' + key);report['added'] += 1
                if apply:
                    if db.execute("SELECT 1 FROM documents WHERE collection='custom' AND id=?", (key,)).fetchone():
                        raise ValueError('Import record ID already exists without a matching batch receipt')
                    for photo_id, (mime, data) in row['assets'].items():
                        old_asset = db.execute('SELECT mime,data FROM assets WHERE id=?', (photo_id,)).fetchone()
                        if old_asset and old_asset != (mime, data):
                            raise ValueError('Photo ID collision; import cancelled')
                        if not old_asset:
                            db.execute('INSERT INTO assets VALUES (?,?,?)', (photo_id, mime, data));report['photosSaved'] += 1
                    db.execute('INSERT INTO documents VALUES (?,?,?)', ('custom', key, encode(item)))
                existing.append({**item, 'id': 'c-' + key})
            report['results'].append(result)
        if apply:
            db.execute('INSERT INTO documents VALUES (?,?,?)', ('profile', ledger_id, encode({'fingerprint': fingerprint, 'report': {k: v for k, v in report.items() if k != 'batchId'}})))
            if request_id:
                db.execute("DELETE FROM documents WHERE collection='profile' AND id=?", ('assistantRequest:' + request_id,))
            store.bump(db)
        return report
