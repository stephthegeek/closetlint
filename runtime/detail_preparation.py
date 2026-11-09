"""Scoped title/tag handoff files. Creating or checking never edits wardrobe records."""
from import_sources import folder, identifier, safe_file, IMAGE_EXT
from photo_preparation import piece, source_photo, write_json, MAX_ZIP
from catalog_photos import CatalogPhotos
from piece_import import VOCAB
from storage import decode


def location(store, instance, request):
    return folder(store, instance, 'tidy-' + identifier(request))


def read(path):
    if path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError('Choose suggestions under 2 MB.')
    return decode(path.read_bytes())


def info(store, instance, request):
    base = location(store, instance, request)
    return {'request': read(safe_file(base, 'request.json')), 'folder': str(base)}


def create(store, instance, request, mode, entries):
    base = location(store, instance, request)
    if mode not in ('titles', 'tags', 'both') or not isinstance(entries, list) or not 1 <= len(entries) <= (48 if mode == 'titles' else 25):
        raise ValueError('Choose up to 48 pieces for titles, or up to 25 for tags.')
    if any(not isinstance(p, dict) or not isinstance(p.get('id'), str) for p in entries) or len({p['id'] for p in entries}) != len(entries):
        raise ValueError('Choose different existing pieces.')
    saved = safe_file(base, 'request.json')
    if saved.exists():
        previous = read(saved)
        if previous['mode'] != mode or [p['id'] for p in previous['pieces']] != [p['id'] for p in entries]:
            raise ValueError('This request belongs to another selection. Choose a new batch.')
        return info(store, instance, request)
    state, sources, pieces = store.state(), {}, []
    catalog = CatalogPhotos(store)
    vocabulary = {f['key']: f for f in VOCAB['fields']}
    for entry in entries:
        item = piece(state, entry['id'])
        fields = []
        if mode != 'tags':
            fields.append({'key': 'name', 'label': 'Title'})
        supplied = entry.get('fields', [])
        if not isinstance(supplied, list) or len(supplied) > len(vocabulary) + 1:
            raise ValueError('Choose applicable title and tag fields.')
        seen = set()
        for field in supplied:
            if not isinstance(field, dict):
                raise ValueError('Invalid tag field.')
            key = field.get('key')
            if key == 'name':
                continue
            definition = vocabulary.get(key)
            if mode == 'titles' or not definition or key in seen:
                raise ValueError('This request contains an unsupported tag field.')
            seen.add(key)
            category = 'Glasses' if item.get('meta') == 'Eyewear' else item.get('meta')
            if definition.get('categories') and category not in definition['categories'] or definition.get('subcategories') and item.get('sub') not in definition['subcategories'] or key == 'sockType' and item.get('sub') != 'Socks':
                raise ValueError('This tag does not apply to the selected piece.')
            choices = field.get('vocab')
            if not isinstance(choices, list) or any(not isinstance(v, str) or v not in definition['vocab'] for v in choices):
                raise ValueError('Use the available tag choices.')
            fields.append({'key': key, 'label': definition['label'], 'multi': bool(definition['multi']), 'vocab': list(dict.fromkeys(choices))})
        current = {'name': item.get('name', 'Piece')}
        current.update({f['key']: item[f['key']] for f in fields if f['key'] in item})
        value = {'id': entry['id'], 'meta': item.get('meta', ''), 'sub': item.get('sub', ''), 'current': current,
                 'originalTitle': item.get('title', ''), 'variant': item.get('variant', ''),
                 'listingDetails': item.get('listingDetails', ''), 'fields': fields, 'source': ''}
        try:
            photo_id, asset = source_photo(store, state, entry['id'], item, catalog)
        except ValueError as error:
            value['photoNote'] = str(error)
        else:
            name = 'source-' + photo_id + IMAGE_EXT[asset[0]]
            sources[name] = asset[1]
            value['source'] = name
        pieces.append(value)
    if sum(map(len, sources.values())) > MAX_ZIP:
        raise ValueError('These photos are too large for one request. Choose fewer pieces.')
    base.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name, data in sources.items():
        safe_file(base, name).write_bytes(data)
    write_json(base, 'request.json', {'format': 'closetlint-tidy-details-request/v1', 'instance': instance,
                                    'requestId': request, 'mode': mode, 'pieces': pieces})
    return info(store, instance, request)


def check(store, instance, request):
    original = info(store, instance, request)['request']
    target = safe_file(location(store, instance, request), 'results.json')
    if not target.exists():
        raise ValueError('No suggestions yet. Ask your AI assistant to save results.json in the request folder, then check again.')
    result = read(target)
    if not isinstance(result, dict) or result.get('instance') != original['instance'] or result.get('requestId') != original['requestId'] or result.get('format') != 'closetlint-tidy-details/v1':
        raise ValueError('These suggestions belong to a different request or closet.')
    # Field-by-field validation and approval happen in the browser before ordinary guarded saves.
    return result
