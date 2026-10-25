#!/usr/bin/env python3
"""Import assistant-prepared pieces and local photos. Preview by default; --apply saves atomically."""
import argparse
import json
import os
import sqlite3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from piece_import import KINDS, LAYER, VOCAB, import_batch, prepare_batch
from storage import Store
from photo_environment import import_in_environment


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, help='Existing wardrobe data folder outside the app source')
    parser.add_argument('--file', type=Path, help='Import JSON, with image files inside the same folder')
    parser.add_argument('--apply', action='store_true', help='Save the validated batch; otherwise preview only')
    parser.add_argument('--duplicates', choices=('skip', 'add'), default='skip', help='Default skip; add is an explicit override')
    parser.add_argument('--promote-wishlist', action='store_true', help='Owned item with one wishlist match: change ownership only')
    parser.add_argument('--allow-no-photo', action='store_true', help='Explicitly permit pieces with no local image')
    parser.add_argument('--schema', action='store_true', help='Print the format, example and current vocabulary; no database needed')
    args = parser.parse_args(argv)
    try:
        if args.schema:
            result = {'format': 'closet-lint-import/v1', 'batchId': 'choose-a-stable-batch-id', 'pieces': [{'name': 'Example tee', 'category': 'Tops', 'subcategory': 'Tees', 'status': 'wishlist', 'size': '', 'retailer': '', 'url': '', 'price': None, 'colors': [], 'images': [{'file': 'photos/tee.jpg', 'kind': 'isolated', 'sourceUrl': ''}]}], 'imageKinds': KINDS, 'layering': LAYER, 'vocabulary': VOCAB}
        else:
            if not args.data or not args.file:
                raise ValueError('Use --data EXISTING_FOLDER --file IMPORT.json, or --schema')
            data = args.data.resolve()
            if data.is_relative_to(ROOT) or not (data / 'wardrobe.sqlite3').is_file():
                raise ValueError('Choose an existing wardrobe outside the source folder. Start the app once to create one; no new data folder is created by this command')
            delegated = import_in_environment(data, list(argv) if argv is not None else sys.argv[1:])
            if delegated is not None:
                return delegated
            batch, digest, rows = prepare_batch(args.file, allow_no_photo=args.allow_no_photo)
            os.umask(0o077)
            result = import_batch(Store(data), batch, digest, rows, apply=args.apply, duplicates=args.duplicates, promote_wishlist=args.promote_wishlist)
        print(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2))
        return 0
    except (ValueError, OSError, KeyError, TypeError, sqlite3.Error) as error:
        print(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
