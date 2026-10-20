#!/usr/bin/env python3
"""Prepare and build a static, explicitly reviewed collection demo.

Prepare: python3 tools/build_public_demo.py --data DATA --collection-id ID --review-dir REVIEW
Build:   python3 tools/build_public_demo.py --data DATA --review-dir REVIEW --out OUT

REVIEW and OUT must be new folders outside the source tree. The review folder is
private: it contains source asset IDs and candidate photos. Nothing is uploaded.
"""
import argparse
import base64
import hashlib
import html
import io
import json
from pathlib import Path
import re
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from storage import Store, decode, media_type, require_safe_pillow
from server import content_policy
from piece_import import KINDS

VOCAB = json.loads((ROOT / 'runtime/import-vocabulary.json').read_text(encoding='utf-8'))
TAG_FIELDS = {field['key']: set(field['vocab']) for field in VOCAB['fields']}
OTHER_TEXT = {'labAs', 'layerNeed', 'weight', 'knitWeight', 'layer', 'needsUnder',
              'sockWeight', 'heel', 'metal'}
OTHER_BOOL = {'wish', 'functional', 'socksOk', 'socksRequired'}
ASSET_ID = re.compile(r'[0-9a-f]{32}\Z')


def public_fields(source):
    """Allow known style fields only; never copy the source record wholesale."""
    result = {}
    for key in ('name', 'meta', 'sub', 'section'):
        value = source.get(key)
        if isinstance(value, str) and value:
            result[key] = value[:200]
    if not result.get('name') or not result.get('meta'):
        raise ValueError('Selected piece lacks a name or type')
    for key, allowed in TAG_FIELDS.items():
        value = source.get(key)
        if isinstance(value, list):
            clean = [item for item in value if isinstance(item, str) and item in allowed][:30]
            if clean:
                result[key] = clean
        elif isinstance(value, str) and value in allowed:
            result[key] = value
    for key in OTHER_TEXT:
        value = source.get(key)
        if isinstance(value, str) and value and len(value) <= 40:
            result[key] = value
    for key in OTHER_BOOL:
        if source.get(key) is True:
            result[key] = True
    return result


def selected_pieces(state, collection_id):
    cols = state['collections']
    collection = cols['profile'].get(collection_id)
    if not isinstance(collection, dict) or collection.get('kind') != 'piece-collection' or collection.get('deleted'):
        raise ValueError('Choose an existing, active piece collection ID')
    catalog = {item['id']: item for item in state['base']['catalog']}
    tags = state['base']['tags']
    cleanup = cols['profile'].get('cleanup', {}).get('map', {})
    photo_map = cols['profile'].get('photoMap', {}).get('map', {})
    result = []
    for piece_id in collection.get('ids', []):
        if piece_id.startswith('c-'):
            source = cols['custom'].get(piece_id[2:])
        else:
            source = catalog.get(piece_id)
        if not isinstance(source, dict):
            raise ValueError('Collection contains a missing piece; repair it before export')
        merged = {**source, **tags.get(piece_id, {}), **cleanup.get(piece_id, {}), **cols['edits'].get(piece_id, {})}
        if not merged.get('photoId') and photo_map.get(piece_id):
            merged['photoId'] = photo_map[piece_id][0]
        result.append((piece_id, merged))
    if not result:
        raise ValueError('Collection is empty')
    return collection, result


def photo_candidates(piece):
    views = piece.get('photos') if isinstance(piece.get('photos'), list) else []
    main = piece.get('photoId')
    if main and all(not isinstance(view, dict) or view.get('photoId') != main for view in views):
        views = [{'photoId': main, 'kind': 'unclassified'}] + views
    else:
        views = sorted(views, key=lambda view: 0 if isinstance(view, dict) and view.get('photoId') == main else 1)
    found = []
    for view in views:
        asset_id = view.get('photoId') if isinstance(view, dict) else None
        if isinstance(asset_id, str) and ASSET_ID.fullmatch(asset_id) and asset_id not in {p['assetId'] for p in found}:
            kind = view.get('kind')
            found.append({'assetId': asset_id, 'kind': kind if kind in KINDS else 'unclassified',
                          'approved': False, 'file': ''})
    return found[:10]


def bundle_fallbacks(store, state, pieces):
    """Find old catalog photos only for pieces without a stored photo."""
    needed = {}
    for piece_id, piece in pieces:
        if not photo_candidates(piece):
            needed[piece_id] = [key for key in (piece_id, piece.get('photoFrom'), piece.get('photoOf')) if isinstance(key, str)]
    found = {}
    for bundle_id in state['base']['bundles']:
        if len(found) == len(needed):
            break
        asset = store.asset(bundle_id)
        if not asset:
            continue
        bundle = decode(asset[1])
        if not isinstance(bundle, dict):
            continue
        for piece_id, keys in needed.items():
            if piece_id not in found:
                for key in keys:
                    if isinstance(bundle.get(key), str) and bundle[key].startswith('data:image/'):
                        found[piece_id] = {'bundleId': bundle_id, 'bundleKey': key,
                                           'kind': 'unclassified', 'approved': False, 'file': ''}
                        break
    return found


def candidate_data(store, candidate):
    if candidate.get('bundleId'):
        asset = store.asset(candidate['bundleId'])
        bundle = decode(asset[1]) if asset else {}
        uri = bundle.get(candidate.get('bundleKey')) if isinstance(bundle, dict) else None
        if not isinstance(uri, str) or not re.fullmatch(r'data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+', uri):
            raise ValueError('A reviewed legacy photo is missing or invalid')
        return base64.b64decode(uri.split(',', 1)[1], validate=True)
    asset_id = candidate.get('assetId')
    asset = store.asset(asset_id) if isinstance(asset_id, str) else None
    if not asset:
        raise ValueError('A reviewed photo is missing')
    return asset[1]


def safe_image(data, max_edge=1600):
    require_safe_pillow()
    from PIL import Image, ImageOps
    if not media_type(data).startswith('image/'):
        raise ValueError('A selected photo is not a supported raster image')
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        image = ImageOps.exif_transpose(source)
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        size = image.size
        output = io.BytesIO()
        image.save(output, format='WEBP', quality=88, method=6)
    return output.getvalue(), size


def checked_folder(path):
    path = path.resolve()
    if path.is_relative_to(ROOT) or path.exists():
        raise ValueError('Choose a new output folder outside the source tree')
    return path


def prepare(store, collection_id, folder):
    state = store.state()
    collection, pieces = selected_pieces(state, collection_id)
    fallbacks = bundle_fallbacks(store, state, pieces)
    entries = []
    for piece_id, piece in pieces:
        entries.append({'sourceId': piece_id, 'include': not (piece.get('hidden') or piece.get('removed')),
                        'public': public_fields(piece), 'photos': photo_candidates(piece) or ([fallbacks[piece_id]] if piece_id in fallbacks else [])})
    review = {'format': 'closet-lint-public-demo/v1', 'approved': False,
              'sourceInstance': state['instance'], 'sourceRevision': state['revision'],
              'collection': {'sourceId': collection_id, 'name': collection['name'],
                             'description': str(collection.get('description', ''))[:1000]},
              'pieces': entries}
    folder.mkdir(parents=True)
    (folder / 'review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    cards = []
    for entry in entries:
        previews = []
        for number, candidate in enumerate(entry['photos'], 1):
            try:
                photo, _ = safe_image(candidate_data(store, candidate), 400)
            except ValueError:
                continue
            name = f"candidate-{len(cards) + 1:03}-{number:02}.webp"
            (folder / name).write_bytes(photo)
            previews.append(f'<figure><img src="{name}" alt=""><figcaption>{html.escape(candidate["kind"])}</figcaption></figure>')
        label = html.escape(entry['public']['name'])
        cards.append(f'<article><div class="photos">{"".join(previews)}</div><strong>{label}</strong><small>{html.escape(entry["public"]["meta"])} · {len(entry["photos"])} photo candidate(s)</small></article>')
    page = '<!doctype html><meta charset="utf-8"><title>Closet Lint demo review</title><style>body{font:16px system-ui;background:#f5efdf;color:#292d28;margin:2rem}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1rem}article{background:#fff;padding:1rem;border:1px solid #d8ceb9;border-radius:12px}.photos{display:flex;gap:.4rem;overflow:auto}figure{margin:0;min-width:160px}img{width:160px;aspect-ratio:1;object-fit:contain}figcaption,small{font-size:.8rem;color:#666}strong,small{display:block;margin-top:.5rem}</style><h1>Demo candidate review</h1><p>Private preview only. Edit review.json to approve pieces and photos; nothing here has been published.</p><main>' + ''.join(cards) + '</main>'
    (folder / 'index.html').write_text(page, encoding='utf-8')
    (folder / 'README.txt').write_text('PRIVATE demo review — do not upload this folder.\nOpen index.html to inspect names and photo candidates. In review.json, set approved to true for the whole review, set include to false for anything to omit, and approve only photos you have permission to publish. A photo can instead use a file path relative to this folder for your own replacement photo. Build into a separate output folder when review is complete.\n', encoding='utf-8')
    return len(entries)


def embed(page, key, value):
    payload = json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    pattern = r'(<script\b[^>]*\bid="' + key + r'"[^>]*>).*?(</script>)'
    page, count = re.subn(pattern, lambda match: match[1] + payload + match[2], page, count=1, flags=re.S)
    if count != 1:
        raise ValueError('App is missing the ' + key + ' data block')
    return page


def build(store, review_folder, out):
    review = json.loads((review_folder / 'review.json').read_text(encoding='utf-8'))
    if review.get('format') != 'closet-lint-public-demo/v1' or review.get('approved') is not True:
        raise ValueError('The review manifest must be explicitly approved before building')
    state = store.state()
    if review.get('sourceInstance') != state['instance'] or review.get('sourceRevision') != state['revision']:
        raise ValueError('The wardrobe changed since review; prepare a fresh manifest')
    _, current = selected_pieces(state, review['collection']['sourceId'])
    fallbacks = bundle_fallbacks(store, state, current)
    if [p['sourceId'] for p in review['pieces']] != [piece_id for piece_id, _ in current]:
        raise ValueError('Collection membership changed since review')
    blob = out / '_blob'
    blob.mkdir(parents=True)
    catalog = []
    for index, (entry, (_, source)) in enumerate(zip(review['pieces'], current), 1):
        if not entry.get('include'):
            continue
        if entry.get('public') != public_fields(source):
            raise ValueError('Piece details changed since review')
        photos = []
        allowed = photo_candidates(source) or ([fallbacks[entry['sourceId']]] if entry['sourceId'] in fallbacks else [])
        for candidate in entry.get('photos', []):
            if not candidate.get('approved'):
                continue
            if candidate.get('file'):
                photo_path = (review_folder / candidate['file']).resolve()
                data = photo_path.read_bytes()
            else:
                if not any(candidate.get('assetId') == original.get('assetId') and
                           candidate.get('bundleId') == original.get('bundleId') and
                           candidate.get('bundleKey') == original.get('bundleKey') for original in allowed):
                    raise ValueError('A reviewed photo is missing or changed')
                data = candidate_data(store, candidate)
            photo, size = safe_image(data)
            asset_id = hashlib.sha256(photo).hexdigest()[:32]
            (blob / asset_id).write_bytes(photo)
            kind = candidate.get('kind')
            photos.append({'photoId': asset_id, 'ar': round(size[0] / size[1], 4),
                           'kind': kind if kind in KINDS else 'unclassified', 'width': size[0], 'height': size[1]})
        if not photos:
            raise ValueError('Every included piece needs at least one approved photo')
        if len(photos) > 10:
            raise ValueError('A piece has more than ten approved photos')
        catalog.append({'id': f'demo-{index:03}', **entry['public'], 'photoId': photos[0]['photoId'],
                        'photos': photos, 'ar': photos[0]['ar']})
    if not catalog:
        raise ValueError('No pieces were included')
    public_collection = {'kind': 'piece-collection', 'name': review['collection']['name'],
                         'description': review['collection']['description'],
                         'ids': [piece['id'] for piece in catalog], 'deleted': False}
    snapshot = {'custom': {}, 'profile': {'collection-demo': public_collection}}
    page = (ROOT / 'app/closet-lint.html').read_text(encoding='utf-8')
    for key, value in (('catalog', catalog), ('tags', {}), ('bundles', []), ('pubdata', snapshot)):
        page = embed(page, key, value)
    (out / 'index.html').write_text(page, encoding='utf-8')
    policy = content_policy(page)
    (out / '.htaccess').write_text('<IfModule mod_headers.c>\n'
                                   f'Header always set Content-Security-Policy "{policy}"\n'
                                   'Header always set X-Content-Type-Options "nosniff"\n'
                                   'Header always set Referrer-Policy "no-referrer"\n'
                                   '</IfModule>\n', encoding='utf-8')
    (blob / '.htaccess').write_text('<FilesMatch "^[0-9a-f]{32}$">\nForceType image/webp\n</FilesMatch>\n', encoding='utf-8')
    return len(catalog)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--collection-id')
    parser.add_argument('--review-dir', type=Path, required=True)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    try:
        data = args.data.resolve()
        if data.is_relative_to(ROOT) or not (data / 'wardrobe.sqlite3').is_file():
            raise ValueError('Choose an existing wardrobe data folder outside the source tree')
        if args.out and args.collection_id or not args.out and not args.collection_id:
            raise ValueError('Prepare with --collection-id, or build with --out')
        store = Store(data)
        if args.out:
            folder = args.review_dir.resolve()
            if folder.is_relative_to(ROOT) or not (folder / 'review.json').is_file():
                raise ValueError('Choose a private review folder outside the source tree')
            out = checked_folder(args.out)
            count = build(store, folder, out)
            print(f'Built a local static demo with {count} reviewed pieces: {out}')
        else:
            folder = checked_folder(args.review_dir)
            count = prepare(store, args.collection_id, folder)
            print(f'Prepared {count} candidates for private review: {folder}')
    except (ValueError, OSError, KeyError, TypeError, sqlite3.Error) as error:
        parser.exit(2, f'Could not prepare the public demo: {error}\n')


if __name__ == '__main__':
    main()
